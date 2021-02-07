# Calculadora HEPA

[calculadorahepa.com](https://www.calculadorahepa.com/)

The CADR calculator that helps you to choose the right air purifier.

![Netlify Status](https://api.netlify.com/api/v1/badges/9c5cff4e-8e3c-4232-aad7-ab36565b0eb8/deploy-status)

# Development

This project uses [Svelte](https://svelte.dev).

- It comes with [TailwindCSS](https://tailwindcss.com/) already baked in (The very awesome [Tailwind docs](https://tailwindcss.com/docs/installation/)).
- Uses [svelte-preprocess](https://github.com/sveltejs/svelte-preprocess) to preprocess Tailwind classes used in `<style>` tags with `@apply`.
- Uses [@rollup/plugin-node-resolve](https://github.com/rollup/plugins/tree/master/packages/node-resolve#extensions) to resolve Svelte files even with `.svelte` extension left off of import.
- Uses [`rollup-plugin-alias`](https://github.com/rollup/plugins/tree/master/packages/alias) to alias the `src` directory to `@` in order to make deeply nested local imports cleaner.

## Get Deps

Install the dependencies...

```bash
cd calculadorahepa && yarn
```

...then start [Rollup](https://rollupjs.org):

```bash
yarn dev
```

Navigate to [localhost:5000](http://localhost:5000).

LiveReload is enabled so when you edit a component file in `src` and save it the browser will reload the page to see your changes.

## Building and running for production

To build an optimised version of the app:

```bash
yarn build
```

You can run the newly built app with `yarn start`. This uses [sirv](https://github.com/lukeed/sirv), which is included in the package.json's `dependencies` so that the app will work when it is deployed to platforms like [Heroku](https://heroku.com).

## Single-page app mode

By default, sirv will only respond to requests that match files in `public`. This is to maximise compatibility with static fileservers, allowing you to deploy your app anywhere.

If you're building a single-page app (SPA) with multiple routes, sirv needs to be able to respond to requests for _any_ path. You can make it so by editing the `"start"` command in package.json:

```js
"start": "sirv public --single"
```

**With assistance from the following:**

How to configure Tailwind in a svelte project? [link](https://github.com/tailwindcss/discuss/issues/254)

Erroneous errors with tailwind-style @ rules [link](https://github.com/UnwrittenFun/svelte-vscode/issues/47)

Import Svelte component ommiting .svelte extension [link](https://stackoverflow.com/questions/58715992/import-svelte-component-ommiting-svelte-extension)
