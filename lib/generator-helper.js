
const { isArray, isFunction, get } = require('lodash')
const { iFThenElse } = require('./fp')

const isGenerator = fn => ['GeneratorFunction', 'AsyncGeneratorFunction'].includes(get(fn, 'constructor.name'))

const toIteratorIfArray = iFThenElse(
  isGenerator
)(
  a => a,
  iFThenElse(
    isArray
  )(
    a => a[Symbol.iterator].bind(a),
    () => { throw new Error('not an array') }
  )
)
const toAsyncIteratorIfArray = iFThenElse(
  isGenerator
)(
  a => a,
  iFThenElse(
    isArray
  )(
    a => a[Symbol.asyncIterator].bind(a),
    a => { throw new Error(`not an array ${a.constructor.name}:::${JSON.stringify(a)}`) }
  )
)
async function * createAsyncIterable (syncIterable) {
  for (const elem of syncIterable) {
    yield elem
  }
}
const extendArrayIterator = arr => otherIterator => {
  const iterator = arr[Symbol.iterator].bind(arr) // normal fn
  arr[Symbol.iterator] = function * () {
    yield * iterator // original array elms
    yield * otherIterator
  }
  return arr
}

const extendArrayIteratorAsync = arr => otherAsyncIterator => {
  const iterator = arr[Symbol.iterator].bind(arr) // normal fn
  arr[Symbol.asyncIterator] = async function * () {
    yield * createAsyncIterable(iterator())
    yield * await otherAsyncIterator()
  }
  // if we put  arr[Symbol.iterator] to be async it can be await Promise.all([...arr])
  return arr
}
module.exports = {
  extendArrayIteratorAsync,
  extendArrayIterator,
  toAsyncIteratorIfArray,
  toIteratorIfArray
}
/**
 *
var myIterable = {
    *[Symbol.iterator]() { // equals to [Symbol.iterator] : function * (){}
        yield 1;
        yield 2;
        yield 3;
    }
}}

interface Iterator<T> {
    next(value?: any): IteratorResult<T>;
    return?(value?: any): IteratorResult<T>;
    throw?(e?: any): IteratorResult<T>;
}
 */

// EX
// async function main () {
//   for await (const key of extendArrayIteratorAsync([1, 2, 3])(
//     toIteratorIfArray(async function * () {
//       yield await (async () => 6)()
//       yield await (async () => 8)()
//     })// cannot put array here
//   )) {
//     console.log(typeof key, key)
//   }
// }

// async function main () {
//   for await (const key of extendArrayIteratorAsync([1, 2, 3])(
//     toIteratorIfArray([5, 6, 7])// cannot put array here
//   )) {
//     console.log(typeof key, key)
//   }
// }
