export function extractTenant(req,res,next){


  try {


    // الأولوية للمستخدم المسجل

    if(req.user?.tenant_id){

      req.tenant_id =
      req.user.tenant_id;


      return next();

    }



    // للاختبار فقط

    const tenant_id =

      req.headers["x-tenant-id"] ||

      req.body?.tenant_id ||

      req.query?.tenant_id;



    if(!tenant_id){

      return res.status(400).json({

        error:
        "TENANT_ID_REQUIRED"

      });

    }



    req.tenant_id = tenant_id;


    next();


  }


  catch(error){


    res.status(500).json({

      error:
      "TENANT_RESOLUTION_FAILED"

    });


  }


}