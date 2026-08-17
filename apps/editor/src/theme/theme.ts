export const EDITOR_THEMES = [
  "dark",
  "light",
  "midnight",
  "nord",
  "dracula",
  "monokai",
  "solarized-dark",
  "solarized-light",
  "graphite",
  "ocean",
] as const;

export type EditorTheme = (typeof EDITOR_THEMES)[number];

export const DEFAULT_EDITOR_THEME: EditorTheme = "dark";

/** Keep in sync with the inline bootstrap in `index.html` and `public/popout.html`. */
export const EDITOR_THEME_STORAGE_KEY = "html5-game-editor.theme";

export interface EditorThemeDefinition {
  id: EditorTheme;
  label: string;
  description?: string;
  /** Settings preview only — editor chrome still uses CSS semantic tokens. */
  preview: readonly string[];
}

export const EDITOR_THEME_DEFINITIONS: readonly EditorThemeDefinition[] = [
  {
    id: "dark",
    label: "Dark",
    description: "Neutral dark gray editor chrome.",
    preview: ["#14161c", "#1b1f29", "#5b8cff", "#e8ecf4"],
  },
  {
    id: "light",
    label: "Light",
    description: "Professional light gray surfaces with a restrained blue accent.",
    preview: ["#e6e8ed", "#f3f4f7", "#3b6fd8", "#1c2330"],
  },
  {
    id: "midnight",
    label: "Midnight",
    description: "Very dark navy chrome with a quiet blue accent.",
    preview: ["#0b0e16", "#161b28", "#5b8cff", "#d9e1f2"],
  },
  {
    id: "nord",
    label: "Nord",
    description: "Cool blue-gray surfaces with a muted cyan accent.",
    preview: ["#2e3440", "#3b4252", "#88c0d0", "#eceff4"],
  },
  {
    id: "dracula",
    label: "Dracula",
    description: "Dark charcoal with a violet accent on selection and focus.",
    preview: ["#282a36", "#343746", "#bd93f9", "#f8f8f2"],
  },
  {
    id: "monokai",
    label: "Monokai",
    description: "Warm charcoal editor chrome with a restrained yellow-green accent.",
    preview: ["#272822", "#3b3c35", "#a6e22e", "#f8f8f2"],
  },
  {
    id: "solarized-dark",
    label: "Solarized Dark",
    description: "Muted blue-green base with warm, low-contrast text.",
    preview: ["#002b36", "#073642", "#268bd2", "#93a1a1"],
  },
  {
    id: "solarized-light",
    label: "Solarized Light",
    description: "Warm cream surfaces with muted brown-gray text.",
    preview: ["#fdf6e3", "#eee8d5", "#268bd2", "#657b83"],
  },
  {
    id: "graphite",
    label: "Graphite",
    description: "Nearly monochrome DCC-style chrome with a minimal accent.",
    preview: ["#2b2b2b", "#3a3a3a", "#4c8dc8", "#e6e6e6"],
  },
  {
    id: "ocean",
    label: "Ocean",
    description: "Deep blue-gray chrome with a cyan accent.",
    preview: ["#0a1926", "#163044", "#3aa7b8", "#d5e8ef"],
  },
];

const EDITOR_THEME_SET = new Set<string>(EDITOR_THEMES);

export function isEditorTheme(value: unknown): value is EditorTheme {
  return typeof value === "string" && EDITOR_THEME_SET.has(value);
}
