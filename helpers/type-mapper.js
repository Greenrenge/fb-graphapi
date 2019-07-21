const text = name => ({ name, type: 'text' })
const int = name => ({ name, type: 'int' })
const date = name => ({ name, type: 'date' })
const float = name => ({ name, type: 'float' })
const boolean = name => ({ name, type: 'boolean' })
const object = name => ({ name, type: 'object' })
const textAll = (...names) => names.map(text)
const dateAll = (...names) => names.map(date)
const intAll = (...names) => names.map(int)
const floatAll = (...names) => names.map(float)
const objectAll = (...names) => names.map(object)
const booleanAll = (...names) => names.map(boolean)

module.exports = {
  text,
  int,
  date,
  float,
  boolean,
  object,
  textAll,
  dateAll,
  intAll,
  floatAll,
  objectAll,
  booleanAll
}
