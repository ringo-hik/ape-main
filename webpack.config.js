const path = require('path');
const webpack = require('webpack');

/**
 * @type {import('webpack').Configuration}
 */
module.exports = {
  target: 'node',
  mode: 'none', // VS Code 확장은 기본적으로 개발자 도구 접근이 필요하므로 최소한의 최적화만 수행
  
  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'out'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]'
  },
  devtool: 'source-map',
  externals: {
    vscode: 'commonjs vscode',
    // 외부 네이티브 모듈이나 노드 모듈 처리
    sqlite3: 'commonjs sqlite3',
    fsevents: 'fsevents',
    bufferutil: 'commonjs bufferutil',
    'utf-8-validate': 'commonjs utf-8-validate'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              compilerOptions: {
                "module": "esnext",
                "moduleResolution": "node"
              }
            }
          }
        ]
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
      }
    ]
  },
  plugins: [
    // Define 플러그인으로 빌드 시간 및 버전 정보 삽입
    new webpack.DefinePlugin({
      'process.env.APE_BUILD_TIME': JSON.stringify(new Date().toISOString()),
      'process.env.APE_VERSION': JSON.stringify(require('./package.json').version)
    })
  ],
  optimization: {
    minimizer: [],
  },
  performance: {
    hints: false
  },
  // Node.js 환경 폴리필
  node: {
    __dirname: false,
    __filename: false
  }
};