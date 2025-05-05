export function displayHelp() {
  console.log(`
  Usage: tomate-cli [options]
  
  Options:
    --help              Show this help message and exit
    --stats             Show productivity stats and exit
    --reset-config      Reset configuration to defaults
    --config-path <p>   Use a custom config file path
    --metrics-path <p>  Use a custom metrics file path
  
  Key Controls (while running):
    p     Pause/Resume timer
    q     Quit
    c     Open config menu
  `);
}
