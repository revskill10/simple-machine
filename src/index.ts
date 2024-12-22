// Define the structure for storage
class Storage {
    private memory: number[];

    constructor(size: number) {
        this.memory = new Array(size).fill(0);
    }

    read(address: number): number {
        return this.memory[address];
    }

    write(address: number, data: number): void {
        this.memory[address] = data;
    }
}

// Define the CPU components
class Register {
    private value: number = 0;

    read(): number {
        return this.value;
    }

    write(data: number): void {
        this.value = data;
    }
}

class RegisterFile {
    private registers: Register[];

    constructor(size: number) {
        this.registers = Array.from({ length: size }, () => new Register());
    }

    read(index: number): number {
        return this.registers[index].read();
    }

    write(index: number, data: number): void {
        this.registers[index].write(data);
    }
}

class ALU {
    execute(operation: string, operand1: number, operand2: number): number {
        switch (operation) {
            case 'ADD':
                return operand1 + operand2;
            case 'SUB':
                return operand1 - operand2;
            case 'MUL':
                return operand1 * operand2;
            case 'DIV':
                return Math.floor(operand1 / operand2);
            default:
                throw new Error(`Unsupported operation: ${operation}`);
        }
    }
}

class ControlUnit {
    private instructionPointer: number = 0;

    fetchInstruction(memory: Storage): number {
        return memory.read(this.instructionPointer++);
    }

    reset(): void {
        this.instructionPointer = 0;
    }
}

class CPU {
    private registers: RegisterFile;
    private alu: ALU;
    private controlUnit: ControlUnit;

    constructor(registerCount: number) {
        this.registers = new RegisterFile(registerCount);
        this.alu = new ALU();
        this.controlUnit = new ControlUnit();
    }

    execute(memory: Storage): void {
        const instruction = this.controlUnit.fetchInstruction(memory);

        // Decode and execute the instruction
        const opcode = (instruction & 0xF000) >> 12;
        const operand1 = (instruction & 0x0F00) >> 8;
        const operand2 = (instruction & 0x00F0) >> 4;
        const destination = instruction & 0x000F;

        switch (opcode) {
            case 0x1: // ADD
                const result = this.alu.execute('ADD', this.registers.read(operand1), this.registers.read(operand2));
                this.registers.write(destination, result);
                break;
            case 0x2: // SUB
                const subResult = this.alu.execute('SUB', this.registers.read(operand1), this.registers.read(operand2));
                this.registers.write(destination, subResult);
                break;
            // Add more cases as needed for other operations
            default:
                throw new Error(`Unknown opcode: ${opcode}`);
        }
    }
}

// Define a simple OS
class Process {
    pid: number;
    memory: Storage;
    registers: RegisterFile;
    instructionPointer: number;
    state: 'ready' | 'running' | 'waiting' | 'terminated';

    constructor(pid: number, memorySize: number, registerCount: number) {
        this.pid = pid;
        this.memory = new Storage(memorySize);
        this.registers = new RegisterFile(registerCount);
        this.instructionPointer = 0;
        this.state = 'ready';
    }

    loadProgram(program: string): void {
        const instructions = program.split(',').map(num => parseInt(num, 10));
        instructions.forEach((instruction, index) => this.memory.write(index, instruction));
    }
}

class Scheduler {
    private processQueue: Process[] = [];
    private currentProcessIndex: number = 0;

    addProcess(process: Process): void {
        this.processQueue.push(process);
    }

    schedule(): Process | null {
        if (this.processQueue.length === 0) return null;

        const process = this.processQueue[this.currentProcessIndex];
        this.currentProcessIndex = (this.currentProcessIndex + 1) % this.processQueue.length;
        return process;
    }

    preempt(): void {
        const runningProcess = this.processQueue.find(p => p.state === 'running');
        if (runningProcess) {
            runningProcess.state = 'ready';
        }
    }
}

class Timer {
    private interval: number;
    private callback: () => void;
    private timerId: NodeJS.Timeout | null = null;

    constructor(interval: number, callback: () => void) {
        this.interval = interval;
        this.callback = callback;
    }

    start(): void {
        this.timerId = setInterval(this.callback, this.interval);
    }

    stop(): void {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
    }
}

class FileSystem {
    private files: Map<string, string> = new Map();

    createFile(name: string, content: string): void {
        this.files.set(name, content);
    }

    readFile(name: string): string {
        if (!this.files.has(name)) {
            throw new Error(`File not found: ${name}`);
        }
        return this.files.get(name) as string;
    }

    writeFile(name: string, content: string): void {
        if (!this.files.has(name)) {
            throw new Error(`File not found: ${name}`);
        }
        this.files.set(name, content);
    }

    deleteFile(name: string): void {
        if (!this.files.has(name)) {
            throw new Error(`File not found: ${name}`);
        }
        this.files.delete(name);
    }
}

class VirtualMemory {
    private pageTable: Map<number, number> = new Map();

    mapVirtualToPhysical(virtualAddress: number, physicalAddress: number): void {
        this.pageTable.set(virtualAddress, physicalAddress);
    }

    resolve(virtualAddress: number): number {
        if (!this.pageTable.has(virtualAddress)) {
            throw new Error(`Invalid virtual address: ${virtualAddress}`);
        }
        return this.pageTable.get(virtualAddress) as number;
    }
}

class Shell {
    private os: SimpleOS;

    constructor(os: SimpleOS) {
        this.os = os;
    }

    executeCommand(command: string): void {
        const args = command.split(' ');
        const cmd = args[0];
        const params = args.slice(1);

        switch (cmd) {
            case 'run':
                const memorySize = parseInt(params[0], 10);
                const registerCount = parseInt(params[1], 10);
                const process = this.os.createProcess(memorySize, registerCount);
                console.log(`Process ${process.pid} created.`);
                break;
            case 'load':
                try {
                    const pid = parseInt(params[0], 10);
                    const fileName = params[1];
                    const program = this.os.getFileSystem().readFile(fileName);
                    this.os.loadProgramIntoProcess(pid, program);
                    console.log(`Program loaded into process ${pid}.`);
                } catch (error) {
                    console.error(error.message);
                }
                break;
            case 'exec':
                try {
                    const pidToExecute = parseInt(params[0], 10);
                    this.os.executeProcess(pidToExecute);
                } catch (error) {
                    console.error(error.message);
                }
                break;
            case 'ls':
                console.log(`Files: ${Array.from(this.os.getFileSystem().files.keys()).join(', ')}`);
                break;
            case 'create':
                const fileName = params[0];
                const content = params.slice(1).join(' ');
                this.os.getFileSystem().createFile(fileName, content);
                console.log(`File ${fileName} created.`);
                break;
            case 'read':
                try {
                    const fileContent = this.os.getFileSystem().readFile(params[0]);
                    console.log(`Content of ${params[0]}: ${fileContent}`);
                } catch (error) {
                    console.error(error.message);
                }
                break;
            case 'delete':
                try {
                    this.os.getFileSystem().deleteFile(params[0]);
                    console.log(`File ${params[0]} deleted.`);
                } catch (error) {
                    console.error(error.message);
                }
                break;
            case 'exit':
                console.log('Exiting shell.');
                process.exit(0);
            default:
                console.log(`Unknown command: ${cmd}`);
        }
    }

    start(): void {
        console.log('Welcome to the SimpleOS Shell');
        const stdin = process.openStdin();
        stdin.addListener('data', (data) => {
            const input = data.toString().trim();
            this.executeCommand(input);
        });
    }
}

class SimpleOS {
    private scheduler: Scheduler;
    private fileSystem: FileSystem;
    private virtualMemory: VirtualMemory;
    private timer: Timer;
    private processes: Map<number, Process>;

    constructor() {
        this.scheduler = new Scheduler();
        this.fileSystem = new FileSystem();
        this.virtualMemory = new VirtualMemory();
        this.timer = new Timer(1000, () => this.preemptProcess());
        this.processes = new Map();
    }

    createProcess(memorySize: number, registerCount: number): Process {
        const pid = Math.floor(Math.random() * 10000);
        const process = new Process(pid, memorySize, registerCount);
        this.scheduler.addProcess(process);
        this.processes.set(pid, process);
        return process;
    }

    loadProgramIntoProcess(pid: number, program: string): void {
        const process = this.processes.get(pid);
        if (!process) throw new Error(`Process ${pid} not found.`);
        process.loadProgram(program);
    }

    executeProcess(pid: number): void {
        const process = this.processes.get(pid);
        if (!process) throw new Error(`Process ${pid} not found.`);

        if (process.state === 'ready') {
            process.state = 'running';
            console.log(`Running process ${process.pid}`);

            try {
                const cpu = new CPU(process.registers["registers"].length);
                cpu.execute(process.memory);
                process.state = 'terminated';
                console.log(`Process ${process.pid} terminated successfully.`);
            } catch (error) {
                console.error(`Error in process ${process.pid}:`, error);
                process.state = 'terminated';
            }
        }
    }

    preemptProcess(): void {
        console.log('Preempting process');
        this.scheduler.preempt();
    }

    run(): void {
        let process = this.scheduler.schedule();
        this.timer.start();

        while (process) {
            if (process.state === 'ready') {
                process.state = 'running';
                console.log(`Running process ${process.pid}`);

                try {
                    const cpu = new CPU(process.registers["registers"].length);
                    cpu.execute(process.memory);
                    process.state = 'terminated';
                } catch (error) {
                    console.error(`Error in process ${process.pid}:`, error);
                    process.state = 'terminated';
                }
            }

            process = this.scheduler.schedule();
        }

        this.timer.stop();
    }

    getFileSystem(): FileSystem {
        return this.fileSystem;
    }

    getVirtualMemory(): VirtualMemory {
        return this.virtualMemory;
    }
}

// Example usage
const os = new SimpleOS();
const shell = new Shell(os);
shell.start();
/*
const os = new SimpleOS();

// Create a process
const process = os.createProcess(16, 4);

// Define a program with basic arithmetic
const program = `
    0x1122, // ADD R1 = R1 + R2
    0x2341, // SUB R3 = R4 - R1
    0x3452  // MUL R3 = R4 * R2
`;
os.getFileSystem().createFile("arithmetic.txt", program);
os.loadProgramIntoProcess(process.pid, program);

// Execute the process
os.executeProcess(process.pid);

*/
