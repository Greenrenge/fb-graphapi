/**
 *
 * @param {*} arr
 *
interface Iterator<T> {
    next(value?: any): IteratorResult<T>;
    return?(value?: any): IteratorResult<T>;
    throw?(e?: any): IteratorResult<T>;
}
 */
const { isArray, isFunction, get } = require('lodash')
const iFThenElse = condition => (then, eLse = _ => _) => input => condition(input) ? then(input) : eLse(input)
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
    () => { throw new Error('not an array') }
  )
)
/**
 *
var myIterable = {
    *[Symbol.iterator]() {
        yield 1;
        yield 2;
        yield 3;
    }
}}
 */
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
  return arr
}

async function main () {
  for await (const key of extendArrayIteratorAsync([1, 2, 3])(
    toIteratorIfArray(async function * () {
      yield await (async () => 6)()
      yield await (async () => 8)()
    })// cannot put array here
  )) {
    console.log(typeof key, key)
  }
}
async function main1 () {
  for await (const key of extendArrayIteratorAsync([1, 2, 3])(
    toIteratorIfArray([5, 6, 7])// cannot put array here
  )) {
    console.log(typeof key, key)
  }
}

main1()
