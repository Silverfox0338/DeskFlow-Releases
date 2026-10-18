# deskflow-addon

Make addons for [DeskFlow](https://github.com/Silverfox0338/DeskFlow-Releases), the Windows desktop layer. You
don't need to install anything, just Node.js:

```
npx deskflow-addon new my-widget        # start a safe addon in ./my-widget
cd my-widget
npx deskflow-addon install              # pack it and open DeskFlow's install prompt
```

| Command | What it does |
|---|---|
| `new <name> [--plugin]` | Creates a starter addon. Add `--plugin` for a C# code plugin project. |
| `validate [folder]` | Checks `addon.json` with DeskFlow's rules, plus hints like a source URL whose host isn't in `permissions.web`. |
| `pack [folder] [--out file]` | Builds the `.deskflow-addon` file to share. Plugins are built with `dotnet` first. |
| `install [folder\|file]` | Packs if needed, then opens it in DeskFlow. |

The full guide covers data sources, templates, layout elements and settings: **[ADDONS.md](https://github.com/Silverfox0338/DeskFlow-Releases/blob/main/ADDONS.md)**.

It has no dependencies and works with Node 18 or newer. Code plugins also need the .NET 10 SDK.
