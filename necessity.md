## 本地预览

npm install

npm run build

npx serve build



## 上传github

  git checkout main
  npm run build



  git checkout gh-pages
  git rm -rf .
  cp -r build/* .
  echo "" > .nojekyll



  git add .
  git commit -m "deploy"
  git push origin gh-pages --force



  git checkout -f main
