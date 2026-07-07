import fs from "fs";
import path from "path";
import { getSupabase } from "../config/supabase.js";


/**
 * 📤 SALIH EXPORT ENGINE
 * تصدير بيانات الشركة تلقائياً
 */


export async function generateExport(tenant_id) {


  try {


    const supabase =
      getSupabase(tenant_id);



    const date =
      new Date()
      .toISOString()
      .split("T")[0];



    // =========================
    // GET DATA
    // =========================


    const tables = [

      "leads",
      "messages",
      "calls",
      "properties",
      "appointments",
      "deals",
      "crm_activities"

    ];



    const exportData = {};



    for (const table of tables) {


      const { data } =

        await supabase
        .from(table)
        .select("*")
        .eq(
          "tenant_id",
          tenant_id
        );


      exportData[table] =
      data || [];


    }







    // =========================
    // CREATE FILE
    // =========================


    const fileName =

    `salih_export_${tenant_id}_${date}.json`;



    const exportPath =

    path.join(
      process.cwd(),
      "exports",
      fileName
    );



    if(
      !fs.existsSync(
        path.dirname(exportPath)
      )
    ){

      fs.mkdirSync(
        path.dirname(exportPath),
        {
          recursive:true
        }
      );

    }



    fs.writeFileSync(

      exportPath,

      JSON.stringify(
        exportData,
        null,
        2
      )

    );







    // =========================
    // SAVE LOG
    // =========================


    await supabase
    .from("crm_activities")
    .insert({

      tenant_id,

      action:
      "data_export",

      note:
      fileName,

      entity_type:
      "export"

    });







    return {


      success:true,


      file:
      fileName,


      path:
      exportPath,


      created_at:
      new Date()
      .toISOString()


    };




  }


  catch(error){


    console.error(

      "❌ Export Engine Error:",
      error.message

    );



    return {


      success:false,


      error:
      error.message


    };


  }


}