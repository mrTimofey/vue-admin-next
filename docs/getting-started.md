# Getting started

In this guide we will create a Vite-based (strongly recommended build tool) application with Flexipanel under-the-hood.

First you should create an empty folder for the application.

## Base code

Create an `index.html` with the following contents:

```html
<!DOCTYPE html>
<html lang="ru">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Loading...</title>
  <!-- Add font link if you want to customize font -->
  <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700&display=swap" rel="stylesheet">
  <!-- Add Font Awesome icon library -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer"
    integrity="sha512-z3gLpd7yknf1YoNbCzqRKc4qyor8gaKU1qmn+CShxbuBusANI9QpRohGBreCFkKxLhei6S9CQXFEbbKuqLg0DA==" />
  <!-- Add Bootstrap (CSS only, JS is not used) -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet" crossorigin="anonymous"
    integrity="sha384-T3c6CoIi6uLrA9TneNEoa7RxnatzjcDSCmG1MXxSR1GAsXEV/Dwwykc2MPK8M2HN">
  <!-- Customize Bootstrap CSS variables if needed -->
  <style>
    :root {
      --bs-font-sans-serif: Rubik;
    }
  </style>
  <!-- Link to your entry point -->
  <script type="module" src="/src/main.ts"></script>
</head>

<body>
	<div id="app"></div>
</body>

</html>
```

Create `src/main.ts` file. There we will bootstrap our application with Flexipanel:

```typescript
import App from 'flexipanel';

// here is a control and customization API for your dashboard
const app = new App();

// ...
// this section is covered in other parts of the docs
// ...

// this shows an application to the user and actually bootstraps it
app.mount('#app');
```

## Build

Now we are ready to build the application.

Install dependencies:

```bash
npm i flexipanel typescript vite
```

Add some useful scripts to the `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "serve": "vite preview",
  }
}
```

* `npm run dev` starts dev-server for the application
* `npm run build` makes a ready-to-deploy production build in `dist` directory
* `npm run serve` runs a static server to test your production build locally

From now you are all-set to [integrate your own backend API](./setup-api.md) with the UI provided by Flexipanel.
