import express from "express";
import axios from "axios";
import crypto from "crypto";

const router = express.Router();


// =========================
// VAPI WEBHOOK
// =========================

router.post("/", async (req, res) => {


  const toolCallId =
    req.body?.message?.toolCalls?.[0]?.id ||
    crypto.randomUUID();



  try {


    // =========================
    // EXTRACT VAPI DATA
    // =========================


    const assistantId =
      req.body?.message?.assistantId;



    const customer =
      req.body?.message?.customer || {};



    const phone =
      customer.phone ||
      "unknown";



    const userMessage =
      req.body?.message?.text ||
      "";





    // =========================
    // SEND TO AI GATEWAY
    // =========================


    const response =
      await axios.post(

        `${process.env.BASE_URL}/ai_gateway`,

        {


          message: {

            assistantId,

            customer: {

              phone

            },


            text:
              userMessage,


            toolCalls:
              req.body?.message?.toolCalls || []


          }


        },

        {

          headers: {

            "x-channel":
              "voice"

          }

        }

      );





    const result =
      response.data;





    // =========================
    // RETURN TO VAPI
    // =========================


    return res.json({

      results:[

        {

          toolCallId,


          result:
            JSON.stringify({

              success:true,

              data:
                result

            })

        }

      ]

    });





  } catch(error){


    console.error(
      "VAPI WEBHOOK ERROR:",
      error.message
    );



    return res.json({

      results:[

        {

          toolCallId,


          result:
            JSON.stringify({

              error:
                "vapi_error"

            })

        }

      ]

    });


  }


});



export default router;