const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    library: 'PageComponent',
    libraryTarget: 'umd',
    globalObject: 'this',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: path.resolve(__dirname, 'tsconfig.json'),
          },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.scss$/,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  externals: {
    'react': 'React',
    'react-dom': 'ReactDOM',
    // 移除antd相关外部依赖，因为我们现在使用TailwindCSS
    // 'antd': 'antd',
    // '@ant-design/icons': 'icons',
    'react-router': 'ReactRouter',
    'react-router-dom': 'ReactRouterDOM',
    'lodash': '_'
  },
  optimization: {
    minimize: true,
  },
  stats: {
    colors: true,
    modules: false,
    chunks: false,
    chunkGroups: false,
    chunkModules: false,
    chunkOrigins: false,
    builtAt: false,
    children: false,
  },
};