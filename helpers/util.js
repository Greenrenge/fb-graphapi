const Decimal = require('decimal')

module.exports.distinct = (value, index, self) => self.indexOf(value) === index
module.exports.sum = (a, b) => a + b
module.exports.sumFloat = (a, b) => Decimal(a).add(b).toNumber()
module.exports.toInt = (a) => parseInt(a)
module.exports.toFloat = (a) => parseFloat(a)
