#!/usr/bin/env swift
// Run from the site root on macOS: swift tools/generate_tanakh_qr.swift
// Core Image generates this static asset offline; no visitor request leaves the site.
import CoreImage
import CoreImage.CIFilterBuiltins
import Foundation

let destination = "https://krostudios.com/tanakh-quiz/#download"
let output = CommandLine.arguments.dropFirst().first ?? "tanakh-quiz/assets/download-qr.svg"
let generator = CIFilter.qrCodeGenerator()
generator.message = Data(destination.utf8)
generator.correctionLevel = "Q"
guard let image = generator.outputImage else { fatalError("QR generation failed") }
let side = Int(image.extent.width)
var pixels = [UInt8](repeating: 0, count: side * side * 4)
pixels.withUnsafeMutableBytes { storage in
    CIContext().render(image, toBitmap: storage.baseAddress!, rowBytes: side * 4,
                       bounds: image.extent, format: .RGBA8,
                       colorSpace: CGColorSpaceCreateDeviceRGB())
}

func dark(_ x: Int, _ y: Int) -> Bool {
    let offset = (y * side + x) * 4
    return pixels[offset + 3] > 127 && pixels[offset] < 128
}
var minimum = side
var maximum = -1
for y in 0..<side {
    for x in 0..<side where dark(x, y) {
        minimum = min(minimum, x, y)
        maximum = max(maximum, x, y)
    }
}
precondition(maximum >= minimum, "QR has no dark modules")
let modules = maximum - minimum + 1
let margin = 4
let canvas = modules + 2 * margin
var paths: [String] = []
for y in minimum...maximum {
    for x in minimum...maximum where dark(x, y) {
        paths.append("M\(x - minimum + margin),\(y - minimum + margin)h1v1h-1z")
    }
}
let svg = """
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 \(canvas) \(canvas)" width="164" height="164" shape-rendering="crispEdges" role="img" aria-labelledby="qr-title qr-description">
  <title id="qr-title">הורדת חידון התנ״ך לטלפון</title>
  <desc id="qr-description">\(destination)</desc>
  <rect width="\(canvas)" height="\(canvas)" fill="#fff"/>
  <path d="\(paths.joined())" fill="#000"/>
</svg>

"""
try svg.write(toFile: output, atomically: true, encoding: .utf8)
print("Wrote \(output): \(modules)×\(modules) modules, four-module quiet zone, correction Q")
