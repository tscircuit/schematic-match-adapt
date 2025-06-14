import { test, expect } from "bun:test"
import { SchematicLayoutPipelineSolver } from "../../lib/solvers/SchematicLayoutPipelineSolver"
import { circuit } from "../../lib/builder"

test("SchematicLayoutPipelineSolver can process a CircuitBuilder netlist", () => {
  // Create a circuit using CircuitBuilder similar to template1.ts
  const C = circuit()

  // Add a chip with 2 left pins and 2 right pins (similar to README example)
  const U1 = C.chip().leftpins(2).rightpins(2)
  U1.pin(1).line(-5, 0).passive().line(-2, 0).label("X")
  U1.pin(2).line(-3, 0).label("Y")
  U1.pin(3).line(4, 0).label("Z")
  U1.pin(4).line(4, 0).label("W")

  // Get the netlist from the circuit
  const inputNetlist = C.getNetlist()

  const solver = new SchematicLayoutPipelineSolver({
    inputNetlist,
  })

  // Solver should be created successfully
  expect(solver).toBeDefined()
  expect(solver.solved).toBe(false)
  expect(solver.failed).toBe(false)

  solver.solve()

  expect(`\n${C.toString()}\n`).toMatchInlineSnapshot(`
    "
             -5.0         0.0         5.0    
     0.8               U1
     0.6               ┌─────┐
     0.4 X─R2──────────┤1   4├───────W
     0.2         Y─────┤2   3├───────Z
     0.0               └─────┘
    "
  `)

  expect(
    `\n${solver.matchPhaseSolver?.outputMatchedTemplates[0]?.template.toString()}\n`,
  ).toMatchInlineSnapshot(`
    "
               -5.0         0.0         5.0    
     0.8                 U1
     0.6                 ┌─────┐
     0.4 ┌───────────────┤1   4├───────D
     0.2 │         ┌─────┤2   3├───────C
     0.0 │         │     └─────┘
    -0.2 │         │
    -0.4 │         │
    -0.6 │         │
    -0.8 │         │
    -1.0 │         │
    -1.2 │         │
    -1.4 │         │
    -1.6 ┴         │
    -1.8           B
    -2.0 R2
    -2.2
    -2.4
    -2.6 ┬
    -2.8 │
    -3.0 │
    -3.2 │
    -3.4 │
    -3.6 │
    -3.8 │
    -4.0 │
    -4.2 │
    -4.4 │
    -4.6 A
    "
  `)

  expect(
    `\n${solver.adaptPhaseSolver?.outputAdaptedTemplates[0]?.template.toString()}\n`,
  ).toMatchInlineSnapshot(`
    "
               -5.0         0.0         5.0    
     0.8                 U1
     0.6                 ┌─────┐
     0.4 ┌───────────────┤1   4├───────D
     0.2 │         ┌─────┤2   3├───────C
     0.0 │         │     └─────┘
    -0.2 │         │
    -0.4 │         │
    -0.6 │         │
    -0.8 │         │
    -1.0 │         │
    -1.2 │         │
    -1.4 │         │
    -1.6 ┴         │
    -1.8           B
    -2.0 R2
    -2.2
    -2.4
    -2.6 ┬
    -2.8 │
    -3.0 │
    -3.2 │
    -3.4 │
    -3.6 │
    -3.8 │
    -4.0 │
    -4.2 │
    -4.4 │
    -4.6 A
    "
  `)

  expect(
    solver.adaptPhaseSolver?.outputAdaptedTemplates[0]?.template.getReadableNetlist(),
  ).toMatchInlineSnapshot(`
    "Boxes:


                          ┌────────────────┐
                R2.2 ──  1│       U1       │4  ── D             
                   B ──  2│                │3  ── C             
                          └────────────────┘


                                 U1.1      
                                  │        
                                  2        
                          ┌────────────────┐
                          │       R2       │                    
                          └────────────────┘
                                  1        
                                  │        
                                  A        

    Complex Connections (more than 2 points):
      (none)"
  `)

  expect(
    solver.adaptPhaseSolver?.outputAdaptedTemplates[0]?.appliedOperations,
  ).toMatchInlineSnapshot(`[]`)

  expect(
    solver.adaptPhaseSolver?.outputAdaptedTemplates[0]?.template.toString(),
  ).toMatchInlineSnapshot(`
    "           -5.0         0.0         5.0    
     0.8                 U1
     0.6                 ┌─────┐
     0.4 ┌───────────────┤1   4├───────D
     0.2 │         ┌─────┤2   3├───────C
     0.0 │         │     └─────┘
    -0.2 │         │
    -0.4 │         │
    -0.6 │         │
    -0.8 │         │
    -1.0 │         │
    -1.2 │         │
    -1.4 │         │
    -1.6 ┴         │
    -1.8           B
    -2.0 R2
    -2.2
    -2.4
    -2.6 ┬
    -2.8 │
    -3.0 │
    -3.2 │
    -3.4 │
    -3.6 │
    -3.8 │
    -4.0 │
    -4.2 │
    -4.4 │
    -4.6 A"
  `)
})
