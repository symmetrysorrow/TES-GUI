use std::io::{self, Write};
use tes_gui_lib::TabManager;
fn main() {
    println!("Welcome to Processor CLI! Type 'help' to see commands.");

    loop {
        print!("> ");
        io::stdout().flush().unwrap();

        let mut input = String::new();
        if io::stdin().read_line(&mut input).is_err() {
            println!("Failed to read input");
            continue;
        }

        let args: Vec<_> = input.trim().split_whitespace().collect();
        if args.is_empty() {
            continue;
        }

        match args[0] {
            "exit" => break,
            "help" => {
                println!("Available commands:");
                println!("  register <tab> <type>");
                println!("  setpath <tab> <path>");
                println!("  analyze <tab>");
                println!("  getiv <tab>");
                println!("  getpulseinfo <tab>");
                println!("  getpulseana <tab> <key> <ch>");
                println!("  savefig <tab> <path>");
            }
            "rg" if args.len() == 3 => {
                match TabManager::RegisterProcessor(args[1].into(), args[2].into()) {
                    Ok(_) => println!("Registered."),
                    Err(e) => println!("Error: {}", e),
                }
            }
            "sp" if args.len() == 3 => {
                match TabManager::SetDataPathCommand(args[1].into(), args[2].into()) {
                    Ok(_) => println!("Path set."),
                    Err(e) => println!("Error: {}", e),
                }
            }
            "anl" if args.len() == 2 => {
                match TabManager::AnalyzeFolderCommand(args[1].into()) {
                    Ok(_) => println!("Analysis done."),
                    Err(e) => println!("Error: {}", e),
                }
            }
            "getiv" if args.len() == 2 => {
                match TabManager::GetIVCommand(args[1].into()) {
                    Ok(json) => println!("{}", serde_json::to_string_pretty(&json).unwrap()),
                    Err(e) => println!("Error: {}", e),
                }
            }
            "getrt" if args.len() == 2 => {
                match TabManager::GetRTCommand(args[1].into()) {
                    Ok(json) => println!("{}", serde_json::to_string_pretty(&json).unwrap()),
                    Err(e) => println!("Error: {}", e),
                }
            }
            "getpulseinfo" if args.len() == 2 => {
                match TabManager::GetPulseInfoCommand(args[1].into()) {
                    Ok(json) => println!("{}", serde_json::to_string_pretty(&json).unwrap()),
                    Err(e) => println!("Error: {}", e),
                }
            }
            "getpulseana" if args.len() == 4 => {
                let key: u32 = args[2].parse().unwrap_or(0);
                let ch: u32 = args[3].parse().unwrap_or(0);
                match TabManager::GetPulseAnalysisCommand(args[1].into(), key, ch) {
                    Ok(json) => println!("{}", serde_json::to_string_pretty(&json).unwrap()),
                    Err(e) => println!("Error: {}", e),
                }
            }
            "savefig" if args.len() == 3 => {
                match TabManager::SaveFigCommand(args[1].into(), args[2].into()) {
                    Ok(_) => println!("Figure saved."),
                    Err(e) => println!("Error: {}", e),
                }
            }
            _ => println!("Unknown or malformed command. Type 'help'."),
        }
    }

    println!("Bye!");
}