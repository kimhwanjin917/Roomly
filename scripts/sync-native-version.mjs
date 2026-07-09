// T-206: package.json 버전을 네이티브 프로젝트(Android/iOS)에 동기화
// versionCode/CURRENT_PROJECT_VERSION은 semver에서 유도: major*10000 + minor*100 + patch
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const version = pkg.version
const [major, minor, patch] = version.split('.').map(Number)
if ([major, minor, patch].some(Number.isNaN)) {
  console.error(`package.json version이 semver가 아닙니다: ${version}`)
  process.exit(1)
}
const code = major * 10000 + minor * 100 + patch

// Android
const gradlePath = path.join(root, 'android', 'app', 'build.gradle')
if (fs.existsSync(gradlePath)) {
  let gradle = fs.readFileSync(gradlePath, 'utf8')
  gradle = gradle
    .replace(/versionCode \d+/, `versionCode ${code}`)
    .replace(/versionName "[^"]*"/, `versionName "${version}"`)
  fs.writeFileSync(gradlePath, gradle)
  console.log(`android: versionName ${version}, versionCode ${code}`)
} else {
  console.warn('android/app/build.gradle 없음 — 스킵')
}

// iOS
const pbxPath = path.join(root, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj')
if (fs.existsSync(pbxPath)) {
  let pbx = fs.readFileSync(pbxPath, 'utf8')
  pbx = pbx
    .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`)
    .replace(/CURRENT_PROJECT_VERSION = \d+;/g, `CURRENT_PROJECT_VERSION = ${code};`)
  fs.writeFileSync(pbxPath, pbx)
  console.log(`ios: MARKETING_VERSION ${version}, CURRENT_PROJECT_VERSION ${code}`)
} else {
  console.warn('ios/App/App.xcodeproj 없음 — 스킵')
}
