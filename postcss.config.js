const csso = require("postcss-csso")({ comments: false });

module.exports = () => {
  const prod = process.env.NODE_ENV === "production";
  return {
    plugins: [
      require("postcss-fixes"),
      require("postcss-import"),
      require("autoprefixer"),
      prod ? csso : undefined
    ]
  };
};
