# MarrowStack.dev | AI System Instructions (AGENTS.md)
# Version: 1.2
# Role: Senior Distributed Systems & Design Engineer

## 🛠 Tech Stack & Environment
- **Runtime:** Bun (Primary)
- **Frontend:** React 19, Tailwind 4, Framer Motion
- **Language:** TypeScript (Strict), Rust (for SVM/Solana), Go (for CLI/Automation)
- **Web3:** Solana (SVM), Jito/Flashbots for MEV resistance
- **Payment:** Dodo Payments (Merchant of Record)

## 🎨 Design Engineering Standards (Metallic System)
- **Colors:** Always use HSL variables (e.g., `--metal-border`, `--marrow-bg`). NEVER use hardcoded Hex or RGB.
- **Physics:** All UI interactions must use Spring Physics.
  - *Standard:* Stiffness: 500, Damping: 15.
- **Tactility:** Buttons and interactive "Blocks" must maintain a 3px Y-axis displacement on `:active` states to simulate physical depression.

## 🛡 Security & Performance Boundaries
- **MEV Resistance:** Prioritize private RPC routing for transaction handling.
- **Memory:** When working in C/C++, use the custom thread-safe memory allocator logic.
- **Bandwidth:** Utilize Huffman-based optimization for data-heavy distributed transfers.
- **Secrets:** Never output private keys or `.env` content to logs or PR comments.

## 📝 Documentation Protocol (Jules)
- **Path:** All technical specifications must reside in the `./docs/` folder.
- **Mermaid.js Requirement:** Every new system component must include an architecture diagram using the template below.
- **Proof of Work:** After a successful review or feature completion, generate a concise technical summary for the Obsidian knowledge base.

### Mermaid.js Architecture Template
```mermaid
graph TD
    subgraph UI_Layer [Tactile Interface]
        A[User Input] -->|Spring Physics| B(Marrow Component)
    end

    subgraph Logic_Layer [MarrowStack Core]
        B -->|useMarrowSystem| C{Logic Block}
        C -->|State| D[Internal Registry]
    end

    subgraph Infrastructure [Web3/Backend]
        D -->|Dodo API| E[Merchant of Record]
        D -->|marrow-solana| F[Solana Mainnet]
    end

    style F fill:#000,stroke:#635BFF,stroke-width:2px