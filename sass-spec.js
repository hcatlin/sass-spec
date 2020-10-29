const tap = require("tap")
const { promises: fs } = require("fs")
const path = require("path")
const child_process = require("child_process")
const { promisify } = require("util")
const exec = promisify(child_process.exec)

const { iterateDir } = require("./lib-js/directory")

/**
 * Return whether the file should have a successful output
 */
function hasOutputFile(files, impl) {
  return (
    files.includes(`output-${impl}.css`) ||
    (files.includes("output.css") && !files.includes(`error-${impl}`))
  )
}

const bins = {
  "dart-sass": `${path.resolve(
    process.cwd(),
    "../dart-sass/bin/sass.exe"
  )} --no-unicode`,
  libsass: `${path.resolve(
    process.cwd(),
    "../libsass/sassc/bin/sassc"
  )} --style expanded`,
}

function normalizeOutput(output = "") {
  return output.replace(/\r?\n+/g, "\n").trim()
}

function escape(text) {
  return text.replace(/\n/g, "\\n").replace(/\r/g, "\\r")
}

/**
 * Executes the spec at `dir` and return an object representing the test results of that spec.
 */
async function executeSpec(dir, opts) {
  const { rootDir, impl } = opts
  const files = await fs.readdir(dir)
  const indented = files.includes("input.sass")
  const inputFile = indented ? "input.sass" : "input.scss"

  const bin = bins[impl]
  const cmdOpts = [`--load-path=${rootDir}`]
  // Pass in the indentend option to the command
  if (indented) {
    cmdOpts.push(impl === "dart-sass" ? "--indented" : "--sass")
  }
  cmdOpts.push(inputFile)
  const cmd = `${bin} ${cmdOpts.join(" ")}`

  const isSuccessCase = hasOutputFile(files, impl)
  let expectedFilename

  if (isSuccessCase) {
    expectedFilename = files.includes(`output-${impl}.css`)
      ? `output-${impl}.css`
      : "output.css"
  } else {
    expectedFilename = files.includes(`error-${impl}`)
      ? `error-${impl}`
      : "error"
  }
  const expected = await fs.readFile(path.resolve(dir, expectedFilename), {
    encoding: "utf-8",
  })
  let actual, resultType
  try {
    const { stdout } = await exec(cmd, {
      cwd: dir,
      encoding: "utf-8",
      stdio: "pipe",
    })
    actual = stdout
    resultType = "success"
  } catch (e) {
    resultType = "error"
    actual = e.stderr
  }

  return {
    expected,
    actual,
    expectedType: isSuccessCase ? "success" : "error",
    actualType: resultType,
  }
}

async function runTest(dir, opts) {
  const { rootDir } = opts
  const relPath = path.relative(rootDir, dir)
  await tap.test(relPath, async (t) => {
    const { expected, actual, expectedType, actualType } = await executeSpec(
      dir,
      opts
    )
    t.equal(
      actualType,
      expectedType,
      `${relPath} expected ${expectedType} but got ${actualType}`
    )
    t.equal(
      normalizeOutput(actual),
      normalizeOutput(expected),
      `${relPath} output differs`
    )
    t.end()
  })
}

const impl = "dart-sass"
const rootDir = path.resolve("spec")
const testDir = "spec"
// TODO this might ignore TODOs in a higher directory
iterateDir(testDir, { impl, rootDir }, runTest)

// async function timeTest() {
//   const start = Date.now()
//   await iterateDir(testDir, { impl, rootDir }, executeSpec)
//   const end = Date.now()
//   console.log((end - start) / 1000)
// }

// timeTest()
