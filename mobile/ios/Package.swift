// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "NovaMobile",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(name: "NovaCore", targets: ["NovaCore"]),
        .executable(name: "NovaApp", targets: ["NovaApp"])
    ],
    targets: [
        .target(
            name: "NovaCoreFFI",
            path: "Sources/NovaCoreFFI",
            publicHeadersPath: "include"
        ),
        .target(
            name: "NovaCore",
            dependencies: ["NovaCoreFFI"],
            path: "Sources/NovaCore"
        ),
        .executableTarget(
            name: "NovaApp",
            dependencies: ["NovaCore"],
            path: "Sources/NovaApp",
            linkerSettings: [
                .unsafeFlags(["-L../../target/debug", "-lnova_core", "-Xlinker", "-rpath", "-Xlinker", "../../target/debug"])
            ]
        )
    ]
)
