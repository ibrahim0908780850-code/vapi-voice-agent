function routeEvent(event, tenant) {
  
  const integrations = tenant.integrations;

  if (integrations.api) {
    sendToAPI(event, integrations.api);
  }

  if (integrations.webhook) {
    sendWebhook(event, integrations.webhook);
  }

  if (integrations.n8n) {
    sendToN8N(event, integrations.n8n);
  }

  if (integrations.sheets) {
    sendToSheets(event, integrations.sheets);
  }
}