import { join } from "https://deno.land/std@0.104.0/path/mod.ts";
import ultra, { router } from "https://deno.land/x/ultra@v0.3/mod.js";

router.get("/markdown", async (context) => {
  const md = await grabFileAndReturnMarkdown("content.md");
  context.response.body = {
    content: md.content,
  };
});

await ultra({
  importmap: await Deno.readTextFile("importmap.json"),
});

// syntax highlight markdown
const grabFileAndReturnMarkdown = async (file) => {
  let md = await Deno.readTextFileSync(join(Deno.cwd(), file));
  md = await fetch("https://markdown-syntax.vercel.app/api", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ markdown: md }),
  });
  return await md.json();
};
