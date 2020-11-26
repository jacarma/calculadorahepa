import svelte from "rollup-plugin-svelte";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import livereload from "rollup-plugin-livereload";
import { terser } from "rollup-plugin-terser";
import postcss from "rollup-plugin-postcss";
import autoPreprocess from "svelte-preprocess";
import alias from "@rollup/plugin-alias";
import path from "path";

const production = !process.env.ROLLUP_WATCH;
const projectRootDir = path.resolve(__dirname);

export default {
  input: "src/main.js",
  output: {
    sourcemap: !production,
    format: "iife",
    name: "app",
    file: "public/build/bundle.js",
  },
  plugins: [
    svelte({
      // enable run-time checks when not in production
      dev: !production,
      preprocess: autoPreprocess(),
      // we'll extract any component CSS out into
      // a separate file — better for performance
      css: (css) => {
        css.write("bundle.css", !production);
      },
    }),
    postcss({ extract: "tailwind.css" }),

    // If you have external dependencies installed from
    // npm, you'll most likely need these plugins. In
    // some cases you'll need additional configuration —
    // consult the documentation for details:
    // https://github.com/rollup/rollup-plugin-commonjs
    resolve({
      browser: true,
      dedupe: ["svelte"],
      extensions: [".svelte", ".js"],
    }),
    commonjs(),
    alias({
      entries: [
        { find: "@", replacement: path.resolve(projectRootDir, "src") },
      ],
    }),
    {
      name: "csv",
      transform(code, id) {
        if (!id.endsWith(".csv")) return null;

        let code1 = code.charCodeAt(0) === 0xfeff ? code.slice(1) : code;
        code1 = code1.replace(/ñ/g, "/n/");
        const encoded = Buffer.from(code1).toString("base64");
        return {
          code: `export default atob("${encoded}").split("\\n").map(l => l.replace(/\\/n\\//g, "ñ").split(","));`,
          map: { mappings: "" },
        };
      },
    },
    // In dev mode, call `npm run start` once
    // the bundle has been generated
    !production && serve(),

    // Watch the `public` directory and refresh the
    // browser on changes when not in production
    !production && livereload("public"),

    // If we're building for production (npm run build
    // instead of npm run dev), minify
    production && terser(),
  ],
  watch: {
    clearScreen: false,
  },
};

function serve() {
  let server;

  function toExit() {
    if (server) server.kill(0);
  }

  return {
    writeBundle() {
      if (server) return;
      server = require("child_process").spawn(
        "npm",
        ["run", "start", "--", "--dev"],
        {
          stdio: ["ignore", "inherit", "inherit"],
          shell: true,
        }
      );

      process.on("SIGTERM", toExit);
      process.on("exit", toExit);
    },
  };
}
