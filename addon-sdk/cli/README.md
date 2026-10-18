# deskflow-addon

Make addons for [DeskFlow](https://github.com/Silverfox0338/DeskFlow-Releases), the Windows desktop layer. You
don't need to install anything, just Node.js:

```
npx deskflow-addon new my-widget        # start a safe addon in ./my-widget
cd my-widget
npx deskflow-addon dev                  # live: DeskFlow reloads it every time you save
```

| Command | What it does |
|---|---|
| `new <name> [--plugin]` | Creates a starter addon. Add `--plugin` for a C# code plugin project. |
| `validate [folder]` | Checks `addon.json` with DeskFlow's rules, plus template syntax, missing images, hosts missing from `permissions.web` and plugin project settings. |
| `pack [folder] [--out file] [--sign key.pem] [--changelog "text"]` | Builds the `.deskflow-addon` file to share. Plugins are built with `dotnet` first. With `updates` in addon.json it also writes `latest.json`; `--sign` writes the `.sig`. |
| `keygen [--out file]` | Makes your signing key (`deskflow-addon-key.pem`, added to .gitignore) and prints the `publicKey` for addon.json. |
| `sign <file> [--key file]` | Signs a package you already built. |
| `install [folder\|file]` | Packs if needed, then opens it in DeskFlow. |
| `doctor [--offline]` | Checks Node.js, the .NET SDK, DeskFlow (installed, version, running, developer mode) and whether a newer `deskflow-addon` exists. |
| `dev [folder] [--keep] [--desktop] [--sandbox]` | Live development (DeskFlow 0.6.1+). Links the folder in DeskFlow's developer mode and opens it in the previewer, so the widget reloads every time you save; rebuilds C# plugins; prints errors, blocked requests and compiler errors. `--desktop` skips the previewer, `--sandbox` also starts a throwaway DeskFlow. Ctrl+C unlinks it (`--keep` leaves it linked). |

The full guide covers data sources, templates, layout elements and settings: **[ADDONS.md](https://github.com/Silverfox0338/DeskFlow-Releases/blob/main/ADDONS.md)**.

It has no dependencies and works with Node 18 or newer. Code plugins also need the .NET 10 SDK; they compile
against the bundled plugin SDK (`sdk/DeskFlow.dll`, a reference-only DLL with IntelliSense docs), which `new --plugin`
copies into your project. New addons get a `$schema` line, so VS Code autocompletes `addon.json`.
