const { isArray, get, isFunction, flow } = require('lodash')

const iFThenElse = condition => (then, eLse = _ => _) => input => condition(input) ? then(input) : eLse(input)
const deferAsync = asyncTask => inputAsyncTask => async () => await asyncTask(inputAsyncTask)
const isNotEmptyArray = arr => isArray(arr) && arr.length
const mergeObjReducer = [(p, c) => ({ ...p, ...c }), {}]
const concatReducer = [(p, c) => p.concat(c), []]
const nullOrUndefined = i => i === null || i === undefined
const fanOutMap = (...fns) => input => fns.map(f => f(input))
const fanInMerge = reducer => inputs => inputs.reduce(...reducer)
const each = (...mapFns) => inputs => isNotEmptyArray(inputs) ? inputs.map(flow(mapFns)) : []
const getRelateProp = (path, defaultVal) => raw => get(raw, path, defaultVal)
const wrappedArray = prop => input => input[prop] && isArray(input[prop]) ? input[prop] : isArray(input) ? input : [input]
const objectBy = name => input => ({ [name]: input })
module.exports = {
  objectBy,
  iFThenElse,
  deferAsync,
  isNotEmptyArray,
  mergeObjReducer,
  concatReducer,
  nullOrUndefined,
  fanOutMap,
  fanInMerge,
  each,
  getRelateProp,
  wrappedArray
}
