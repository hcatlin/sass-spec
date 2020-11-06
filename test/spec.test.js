const path = require("path")
const tap = require("tap")
const { runSpec } = require("../lib-js/spec")
const { withArchive } = require("../lib-js/hrx")

const baseOpts = {
  impl: "sass-mock",
  bin: `node ${path.resolve(__dirname, "fixtures/sass-exec-mock.js")}`,
  rootDir: path.resolve(__dirname, "fixtures"),
}
withArchive(path.resolve(__dirname, "fixtures/spec.hrx"), async (dir) => {
  await tap.test("executeSpec", async (t) => {
    async function runWithOpts(subdir, opts) {
      // Create a new `Test` object so it won't be run as part of the suite
      const t = new tap.Test()
      await runSpec(t, path.resolve(dir, subdir), {
        ...baseOpts,
        ...opts,
      })
      t.end()
      // console.log(subdir, t.counts)
      return t
    }
    // TODO there's gotta be a better way to tally this
    t.equal(
      (await runWithOpts("output")).counts.fail,
      0,
      "basic output success case"
    )
    t.notEqual(
      (await runWithOpts("output-fail")).counts.fail,
      0,
      "expected output failure case"
    )
    t.equal(
      (await runWithOpts("error")).counts.fail,
      0,
      "basic error success case"
    )
    t.notEqual(
      (await runWithOpts("error-fail")).counts.fail,
      0,
      "expected error failure case"
    )

    t.test("warning cases", async (t) => {
      t.equal(
        (await runWithOpts("warning/pass")).counts.fail,
        0,
        "success case"
      )

      t.notEqual(
        (await runWithOpts("warning/mismatch")).counts.fail,
        0,
        "fail when warnings are different"
      )

      t.notEqual(
        (await runWithOpts("warning/missing")).counts.fail,
        0,
        "fail when warning is missing"
      )

      t.notEqual(
        (await runWithOpts("warning/extraneous")).counts.fail,
        0,
        "fail when extraneous warning is present"
      )

      t.equal(
        (await runWithOpts("warning/mismatch", { todoWarning: true })).counts
          .fail,
        0,
        "skip warning checks if `todoWarning` option enabled"
      )
      t.todo("handle todoWarning")
      t.end()
    })

    t.test("ignore", async (t) => {
      t.equal(
        (await runWithOpts("output", { mode: "ignore" })).counts.skip,
        1,
        "marks a test as a `skip` when the `ignore` option is set"
      )
    })

    t.test("todo", async (t) => {
      t.equal(
        (await runWithOpts("output", { mode: "todo" })).counts.todo,
        1,
        "marks a test as a `todo` when the `todo` option is set"
      )
      t.equal(
        (await runWithOpts("output", { mode: "todo", todo: "run" })).counts
          .todo,
        0,
        "runs todos if `todo` is set to `run`"
      )
      t.todo("fails on success if probeTodo is passed as input")
      t.end()
    })
    t.end()
  })
})
