# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `yarn install`

install all dependencies needed.


### `cp src/config.json.example src/config.json`

set up the config of the app.

### `set up smart contract address on src/config.json`

```bash
{
    "smartContractAddress": "" // YOUR TESTNET ACCOUNT ADDRESS WHERE SMART CONTRACT LIVES
}
```

### `yarn start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `yarn test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `yarn build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

## Store Data into Blockchain example can be found in:
`storeCryptoChumSpriteState`

## Retrieve Data into Blockchain example can be found in:
`getSpriteIDs`

## Running `nft-storage-uploader` Script
```bash
cd nft-storage-uploader
yarn install
make sure images folder are filled with image files
node index.js 
```
