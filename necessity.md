## 本地预览

npm install

npm run build

npx serve build

## 上传github

 npm install

 npm run build

 git checkout main

  git checkout gh-pages

  rmdir /s /q node_modules
  git rm -rf .
  xcopy /E /Y build\* .
  echo "" > .nojekyll

  git add .
  git commit -m "deploy"
  git push origin gh-pages --force

  git checkout -f main



## 自动脚本

start.bat

npm run deploy(确保使用前main分支提交干净)
