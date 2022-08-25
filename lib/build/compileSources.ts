import type {
  Module,
} from "https://deno.land/x/deno_graph@0.32.0/lib/types.d.ts";
import { hash } from "../utils/hash.ts";
import { addFileContentHash } from "./utils/path.ts";
import { fromFileUrl } from "./deps.ts";
import type { BuildContext } from "./types.ts";

type CompileSourcesOptions = {
  sourceMaps?: boolean;
  minify?: boolean;
  hash?: boolean;
};

/**
 * Compiles sources found in the ModuleGraph and overwrites the source file
 * with the compiled result.
 */
export async function compileSources(
  context: BuildContext,
  options: CompileSourcesOptions,
) {
  const { transformSource } = await import("../compiler/transform.ts");
  const compiled = new Map<string, string>();

  /**
   * Compile the server entrypoint
   */
  try {
    const serverSource = await Deno.readTextFile(context.paths.output.server);
    const server = await transformSource(serverSource, {
      filename: context.paths.output.server,
      development: false,
      minify: false,
      sourceMaps: false,
    });
    /**
     * Overwrite the server entrypoint with the compiled code
     */
    await Deno.writeTextFile(context.paths.output.server, server.code);
  } catch (error) {
    throw error;
  }

  /**
   * Now compile the module graph
   */
  if (context.graph) {
    for (const module of context.graph.modules) {
      const transformed = await transformSource(module.source, {
        filename: module.specifier,
        development: false,
        minify: options.minify || true,
        sourceMaps: options.sourceMaps,
      });

      const outputPath = options.hash
        ? await getModuleOutputPath(module)
        : fromFileUrl(module.specifier);

      await Deno.writeTextFile(outputPath, transformed.code);

      compiled.set(module.specifier, outputPath);
      context.files.set(fromFileUrl(module.specifier), outputPath);

      if (transformed.map) {
        await Deno.writeTextFile(`${outputPath}.map`, transformed.map);
      }
    }
  }

  return compiled;
}

async function getModuleOutputPath(module: Module) {
  const outputPath = fromFileUrl(module.specifier);
  const sourceHash = await hash(module.source);

  return addFileContentHash(outputPath, sourceHash);
}
