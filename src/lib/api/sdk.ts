/**
 * KaziFlow — SDK Generation
 * ------------------------------------------------------------------
 * Generates client SDK code snippets and installation instructions for
 * multiple languages (TypeScript, Python, cURL, Go, Java, PHP, Ruby).
 */

const SUPPORTED_LANGUAGES = [
  { id: "typescript", label: "TypeScript", install: "npm install @kaziflow/sdk" },
  { id: "python", label: "Python", install: "pip install kaziflow" },
  { id: "curl", label: "cURL", install: "No installation required" },
  { id: "go", label: "Go", install: "go get github.com/kaziflow/sdk-go" },
  { id: "java", label: "Java", install: "implementation 'com.kaziflow:sdk:1.0.0'" },
  { id: "php", label: "PHP", install: "composer require kaziflow/sdk" },
  { id: "ruby", label: "Ruby", install: "gem install kaziflow" },
];

export interface GenerateSdkInput {
  apiKey: string;
  language: string;
  baseUrl?: string;
}

export function generateSdkCode(input: GenerateSdkInput): string {
  const { apiKey, language, baseUrl = "https://api.kaziflow.com/v1" } = input;

  switch (language) {
    case "typescript":
      return `import { KaziFlowClient } from "@kaziflow/sdk";

const client = new KaziFlowClient({
  apiKey: "${apiKey}",
  baseUrl: "${baseUrl}",
});

// List clients
const clients = await client.clients.list({ limit: 10 });
console.log(clients);

// Create an invoice
const invoice = await client.invoices.create({
  clientId: "client_123",
  issueDate: new Date().toISOString(),
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  currency: "KES",
  taxRate: 16,
  items: [{ description: "Consulting", quantity: 1, unitPrice: 5000 }],
});
console.log(invoice);`;

    case "python":
      return `from kaziflow import KaziFlowClient

client = KaziFlowClient(
    api_key="${apiKey}",
    base_url="${baseUrl}",
)

# List clients
clients = client.clients.list(limit=10)
print(clients)

# Create an invoice
invoice = client.invoices.create(
    client_id="client_123",
    issue_date=datetime.now().isoformat(),
    due_date=(datetime.now() + timedelta(days=30)).isoformat(),
    currency="KES",
    tax_rate=16,
    items=[{"description": "Consulting", "quantity": 1, "unit_price": 5000}],
)
print(invoice)`;

    case "curl":
      return `# List clients
curl -X GET "${baseUrl}/clients" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json"

# Create an invoice
curl -X POST "${baseUrl}/invoices" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "clientId": "client_123",
    "issueDate": "${new Date().toISOString().split('T')[0]}",
    "dueDate": "${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}",
    "currency": "KES",
    "taxRate": 16,
    "items": [{"description": "Consulting", "quantity": 1, "unitPrice": 5000}]
  }'`;

    case "go":
      return `package main

import (
    "fmt"
    "github.com/kaziflow/sdk-go"
)

func main() {
    client := kaziflow.NewClient(kaziflow.Config{
        APIKey: "${apiKey}",
        BaseURL: "${baseUrl}",
    })

    clients, err := client.Clients.List(ctx, &kaziflow.ListClientsParams{Limit: 10})
    if err != nil { panic(err) }
    fmt.Println(clients)

    invoice, err := client.Invoices.Create(ctx, &kaziflow.CreateInvoiceParams{
        ClientID:   "client_123",
        IssueDate:  time.Now(),
        DueDate:    time.Now().AddDate(0, 0, 30),
        Currency:   "KES",
        TaxRate:    16,
        Items:      []kaziflow.InvoiceItem{{Description: "Consulting", Quantity: 1, UnitPrice: 5000}},
    })
    if err != nil { panic(err) }
    fmt.Println(invoice)
}`;

    case "java":
      return `import com.kaziflow.*;

KaziFlowClient client = new KaziFlowClient.Builder()
    .apiKey("${apiKey}")
    .baseUrl("${baseUrl}")
    .build();

// List clients
List<Client> clients = client.clients().list(ListClientsParams.builder().limit(10).build());
System.out.println(clients);

// Create an invoice
Invoice invoice = client.invoices().create(CreateInvoiceParams.builder()
    .clientId("client_123")
    .issueDate(LocalDate.now())
    .dueDate(LocalDate.now().plusDays(30))
    .currency("KES")
    .taxRate(16)
    .items(List.of(InvoiceItem.builder().description("Consulting").quantity(1).unitPrice(5000).build()))
    .build());
System.out.println(invoice);`;

    case "php":
      return `<?php
require 'vendor/autoload.php';

use KaziFlow\\KaziFlowClient;

$client = new KaziFlowClient([
    'api_key' => '${apiKey}',
    'base_url' => '${baseUrl}',
]);

// List clients
$clients = $client->clients->list(['limit' => 10]);
print_r($clients);

// Create an invoice
$invoice = $client->invoices->create([
    'client_id' => 'client_123',
    'issue_date' => date('Y-m-d'),
    'due_date' => date('Y-m-d', strtotime('+30 days')),
    'currency' => 'KES',
    'tax_rate' => 16,
    'items' => [['description' => 'Consulting', 'quantity' => 1, 'unit_price' => 5000]],
]);
print_r($invoice);
?>`;

    case "ruby":
      return `require 'kaziflow'

client = KaziFlow::Client.new(
  api_key: "${apiKey}",
  base_url: "${baseUrl}"
)

# List clients
clients = client.clients.list(limit: 10)
puts clients

# Create an invoice
invoice = client.invoices.create(
  client_id: "client_123",
  issue_date: Date.today.to_s,
  due_date: (Date.today + 30).to_s,
  currency: "KES",
  tax_rate: 16,
  items: [{description: "Consulting", quantity: 1, unit_price: 5000}]
)
puts invoice`;

    default:
      return `# SDK not available for language: ${language}`;
  }
}

export function getSdkLanguages() {
  return SUPPORTED_LANGUAGES;
}
