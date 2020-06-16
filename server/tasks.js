require('isomorphic-fetch');

try {
  require(`./tasks/${process.argv[2]}.js`)();
} catch (e) {
  console.log(e);
}
