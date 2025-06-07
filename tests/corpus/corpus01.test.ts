import { test, expect } from "bun:test"
import { testTscircuitCodeForLayout } from "tests/tscircuit/testTscircuitCodeForLayout"
import { corpus1Code } from "website/pages/corpus/corpus01.page"
import corpus1LayoutJson from "corpus/corpus2025-05-03-abcd1234.json"
import { circuitBuilderFromLayoutJson } from "lib/index"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"

test("corpus01 - template matching and basic structure", async () => {
  const templateFn = () =>
    circuitBuilderFromLayoutJson(corpus1LayoutJson as any)

  const { solver, laidOutCircuitJson } = await testTscircuitCodeForLayout(
    corpus1Code,
    {
      templateFns: [templateFn],
    },
  )

  expect(solver.getLayout()).toMatchInlineSnapshot(`
    {
      "boxes": [
        {
          "bottomPinCount": 0,
          "boxId": "U1",
          "centerX": -0.20000000000000018,
          "centerY": 2.5000000000000004,
          "leftPinCount": 2,
          "pins": [
            {
              "pinNumber": 1,
              "x": -1.6,
              "y": 2.5000000000000004,
            },
            {
              "pinNumber": 2,
              "x": -1.6,
              "y": 2.3000000000000003,
            },
            {
              "pinNumber": 3,
              "x": 1.1999999999999997,
              "y": 2.3000000000000003,
            },
            {
              "pinNumber": 4,
              "x": 1.1999999999999997,
              "y": 2.5000000000000004,
            },
          ],
          "rightPinCount": 2,
          "topPinCount": 0,
        },
        {
          "bottomPinCount": 1,
          "boxId": "P1",
          "centerX": -2.5000000000000004,
          "centerY": 1.2,
          "leftPinCount": 0,
          "pins": [
            {
              "pinNumber": 1,
              "x": -2.5000000000000004,
              "y": 0.7,
            },
            {
              "pinNumber": 2,
              "x": -2.5000000000000004,
              "y": 1.7,
            },
          ],
          "rightPinCount": 0,
          "topPinCount": 1,
        },
      ],
      "junctions": [
        {
          "junctionId": "XX1",
          "x": -2.5,
          "y": 0.5,
        },
      ],
      "netLabels": [
        {
          "anchorPosition": "left",
          "netId": "NET1",
          "netLabelId": "NL1",
          "x": -2.4000000000000004,
          "y": 0.6000000000000001,
        },
        {
          "anchorPosition": "left",
          "netId": "NET2",
          "netLabelId": "NL2",
          "x": 1.2000000000000002,
          "y": 2.6,
        },
      ],
      "paths": [
        {
          "from": {
            "boxId": "P1",
            "pinNumber": 2,
          },
          "points": [
            {
              "x": -2.4000000000000004,
              "y": 2.2,
            },
            {
              "x": -1.2000000000000002,
              "y": 2.6,
            },
            {
              "x": -1.2000000000000002,
              "y": 2.6,
            },
            {
              "x": -1,
              "y": 2,
            },
            {
              "x": -1,
              "y": 2,
            },
            {
              "x": -1,
              "y": 1.5,
            },
            {
              "x": -1,
              "y": 1.5,
            },
            {
              "x": -1,
              "y": 1,
            },
            {
              "x": -1,
              "y": 1,
            },
            {
              "x": -1,
              "y": 0.5,
            },
            {
              "x": -1,
              "y": 0.5,
            },
            {
              "x": -1.5,
              "y": 0.5,
            },
            {
              "x": -1.5,
              "y": 0.5,
            },
            {
              "x": -2,
              "y": 0.5,
            },
            {
              "x": -2,
              "y": 0.5,
            },
            {
              "x": -2.5,
              "y": 0.5,
            },
          ],
          "to": {
            "boxId": "U1",
            "pinNumber": 1,
          },
        },
        {
          "from": {
            "boxId": "P1",
            "pinNumber": 1,
          },
          "points": [
            {
              "x": -2.4000000000000004,
              "y": 1.2,
            },
            {
              "x": -2.4000000000000004,
              "y": 0.6000000000000001,
            },
            {
              "x": -2.4000000000000004,
              "y": 1.2,
            },
            {
              "x": -2.4000000000000004,
              "y": 0.5,
            },
            {
              "x": -2.4000000000000004,
              "y": 0.5,
            },
            {
              "x": -2.5,
              "y": 0.5,
            },
          ],
          "to": {
            "netId": "undefined",
            "netLabelId": "loaded-nl-64033ad4-73e8-408b-9375-bd5e993f8bf4-0",
          },
        },
      ],
    }
  `)

  expect(
    convertCircuitJsonToSchematicSvg(laidOutCircuitJson),
  ).toMatchSvgSnapshot(import.meta.path)
})
