const fs = require("fs");
const ejs = require("ejs");

try {
  fs.mkdirSync("./public/purificador");
} catch (e) {}

const template = fs.readFileSync("./product-template.html", {
  encoding: "utf-8",
});
const f = fs.readFileSync("./src/purificadores.csv", "utf-8");

const csv = f
  .slice(1)
  .split("\n")
  .map((line, i) => {
    const p = line.split(",");
    return {
      name: p[0],
      price: +p[1],
      filter: p[2],
      CADR: +p[3],
      db: +(p[4] || 99),
      ASIN: p[5],
      id: i,
    };
  });

csv.forEach((p) => {
  fs.writeFile(
    `./public/purificador/${safeName(p.name)}.html`,
    ejs.render(template, p, { debug: false }),
    (err) => {
      if (err) {
        return console.error(
          `Autsch! Failed to store template: ${err.message}.`
        );
      }
    }
  );
});

function safeName(name) {
  return name.replace(/\W+/g, "_");
}
