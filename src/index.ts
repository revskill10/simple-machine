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

// Simulate the machine
const storage = new Storage(256); // 256 memory locations
const cpu = new CPU(4); // 4 registers

// Example program: ADD R0 and R1, store result in R2
storage.write(0, 0x1120); // Opcode 1 (ADD), operands R1 and R2, result in R0
storage.write(1, 0x0000); // Halt (for simplicity)

// Initialize registers
cpu["registers"].write(0, 5); // R0 = 5
cpu["registers"].write(1, 10); // R1 = 10

// Run the program
try {
    cpu.execute(storage);
    console.log("R2:", cpu["registers"].read(2)); // Should output 15
} catch (error) {
    console.error("Execution error:", error);
}
