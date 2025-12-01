import localFont from "next/font/local";

export const christmasFont = localFont({
  // use relative path so Next resolves the local font file
  src: "../public/fonts/MagicalNordic.otf",
  variable: "--font-christmas",
  display: "swap",
});
