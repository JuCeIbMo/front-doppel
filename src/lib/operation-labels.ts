/** How each Doppel Operation reads to an Owner. Unknown names fall back to the raw name. */
const LABELS: Record<string, string> = {
  add_product: "Producto agregado",
  attach_payment_proof: "Comprobante de pago recibido",
  cancel_order: "Pedido cancelado",
  change_price: "Precio cambiado",
  confirm_payment: "Pago confirmado",
  connect_whatsapp_line: "WhatsApp conectado",
  declare_manager_phone: "Teléfono de encargado agregado",
  deliver_order: "Pedido entregado",
  disable_public_agent: "Bot pausado",
  disconnect_whatsapp_line: "WhatsApp desconectado",
  enable_public_agent: "Bot activado",
  escalate_to_owner: "Conversación pasada a ti",
  expire_order: "Pedido vencido",
  message_contact: "Mensaje enviado a un cliente",
  name_business: "Nombre del negocio cambiado",
  place_order: "Pedido creado",
  record_business_knowledge: "Información del negocio actualizada",
  refund_order: "Pedido reembolsado",
  register_sale: "Venta registrada",
  reply_to_contact: "Respondiste a un cliente",
  restore_price: "Precio restaurado",
  resume_public_agent: "Bot reactivado en un chat",
  rotate_whatsapp_line_credential: "Credencial de WhatsApp renovada",
  send_template: "Plantilla enviada a un cliente",
  send_web_message: "Mensaje al agente",
  submit_template: "Plantilla enviada a revisión",
  set_manager_phones: "Teléfonos de encargados actualizados",
  void_sale: "Venta anulada",
};

export function operationLabel(name: string): string {
  return LABELS[name] ?? name;
}
