// scr/handlers/channel.sender.js

import axios from "axios";
import { getSupabase } from "../config/supabase.js";


/**
 * 🔍 GET TENANT INTEGRATIONS
 */
async function getTenantIntegration(tenant_id, provider) {

  const supabase = getSupabase(tenant_id);

  const { data, error } = await supabase
    .from("tenant_integrations")
    .select("*")
    .eq("tenant_id", tenant_id)
    .eq("provider", provider)
    .single();


  if (error || !data) {
    throw new Error(
      `Integration not found: ${provider}`
    );
  }

  return data;
}


/**
 * 🏢 GET COMPANY SETTINGS
 */
async function getCompanySettings(tenant_id) {

  const supabase = getSupabase(tenant_id);

  const { data } = await supabase
    .from("company_settings")
    .select("*")
    .eq("tenant_id", tenant_id)
    .single();

  return data || {};
}


/**
 * 📲 WHATSAPP CLOUD API
 */
export async function sendWhatsAppMessage({
  tenant_id,
  phone,
  message
}) {

  try {

    const integration =
      await getTenantIntegration(
        tenant_id,
        "whatsapp"
      );


    await axios.post(
      `https://graph.facebook.com/v19.0/${integration.phone_number_id}/messages`,
      {
        messaging_product: "whatsapp",

        to: phone,

        type:"text",

        text:{
          body:message
        }
      },
      {
        headers:{
          Authorization:
          `Bearer ${integration.access_token}`,

          "Content-Type":
          "application/json"
        }
      }
    );


    console.log(
      "✅ WhatsApp sent:",
      phone
    );


    return {
      success:true,
      channel:"whatsapp"
    };


  } catch(error){

    console.error(
      "❌ WhatsApp error:",
      error.response?.data ||
      error.message
    );


    return {
      success:false,
      error:error.message
    };
  }
}





/**
 * 🟦 META MESSENGER + INSTAGRAM
 */
export async function sendMetaMessage({

  tenant_id,
  user_id,
  message

}) {


  try {


    const integration =
      await getTenantIntegration(
        tenant_id,
        "meta"
      );


    await axios.post(

      "https://graph.facebook.com/v19.0/me/messages",

      {

        recipient:{
          id:user_id
        },

        message:{
          text:message
        }

      },

      {

        params:{
          access_token:
          integration.access_token
        }

      }

    );


    console.log(
      "✅ Meta message sent"
    );


    return {
      success:true,
      channel:"meta"
    };


  }

  catch(error){

    console.error(
      "❌ Meta error:",
      error.response?.data ||
      error.message
    );


    return {
      success:false,
      error:error.message
    };

  }

}





/**
 * 📧 EMAIL
 */
export async function sendEmailMessage({

  tenant_id,
  email,
  subject,
  message

}) {


  try {


    const company =
      await getCompanySettings(
        tenant_id
      );


    const sender =
      company.sales_email ||
      company.email ||
      "no-reply@salih.ai";


    const apiKey =
      process.env.SENDGRID_API_KEY;



    await axios.post(

      "https://api.sendgrid.com/v3/mail/send",

      {

        personalizations:[

          {

            to:[
              {
                email
              }
            ]

          }

        ],


        from:{
          email:sender,
          name:
          company.company_name ||
          "SALIH AI"
        },


        subject:
        subject ||
        "رسالة من صالح AI",


        content:[

          {

            type:"text/plain",

            value:message

          }

        ]

      },


      {

        headers:{

          Authorization:
          `Bearer ${apiKey}`,

          "Content-Type":
          "application/json"

        }

      }

    );


    console.log(
      "✅ Email sent:",
      email
    );


    return {
      success:true,
      channel:"email"
    };


  }

  catch(error){


    console.error(
      "❌ Email error:",
      error.response?.data ||
      error.message
    );


    return {
      success:false,
      error:error.message
    };

  }

}