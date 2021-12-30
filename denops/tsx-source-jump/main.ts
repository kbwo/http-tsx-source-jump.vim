// deno-lint-ignore-file require-await
import { Denops } from "https://deno.land/x/denops_std@v1.0.0/mod.ts";
import { ensureString } from "https://deno.land/x/unknownutil@v1.0.0/mod.ts";

let listener: Deno.Listener | undefined;

export async function main(denops: Denops): Promise<void> {
  denops.dispatcher = {
    async listenBrowser(args: unknown): Promise<void> {
      ensureString(args);
      if (typeof Number(args) !== "number") {
        console.error("argument of port must be number");
        return;
      }
      if (listener) {
        listener.close();
        listener = undefined;
      }
      const port = Number(args);
      listener = Deno.listen({ port });

      const serve = async () => {
        for await (const conn of listener!) {
          serveHttp(conn);
        }

        async function serveHttp(conn: Deno.Conn) {
          const httpConn = Deno.serveHttp(conn);

          for await (const requestEvent of httpConn) {
            const decoded = decodeURIComponent(requestEvent.request.url);
            const filePath = decoded.replace(`http://127.0.0.1:${port}/`, "");
            const fileElements = filePath.split(":");
            if (fileElements.length !== 3) {
              console.error("given file path is unexpected");
            }
            const fileName = fileElements[0];
            const line = fileElements[1];
            const col = fileElements[2];
            denops.cmd(`tabnew +${line} ${fileName}`);
            denops.cmd(`call cursor(${line},${col})`);
          }
        }
      };
      serve();
    },
    async closeListener(): Promise<void> {
      if (listener) {
        listener.close();
        listener = undefined;
      }
    },
  };

  await denops.cmd(
    `command! -nargs=1 TSJOpenServer call denops#request('${denops.name}', 'listenBrowser', [<q-args>])`,
  );
  await denops.cmd(
    `command! TSJCloseServer call denops#request('${denops.name}', 'closeListener', [])`,
  );
}
