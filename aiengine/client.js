import { usage, buildCommandHandlers, ensureRuntime } from './src/commands.js';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    usage();
    return;
  }

  try {
    ensureRuntime();

    const cmd = args[0];
    const handlers = buildCommandHandlers(args);
    const handler = handlers[cmd];

    if (!handler) {
      console.error(`Error: Unknown command: ${cmd}`);
      process.exitCode = 1;
      usage();
      return;
    }

    await handler();
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  }
}

main();