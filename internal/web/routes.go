package web

import (
	"doudian/internal/config"
	"doudian/internal/web/controller"
	"doudian/internal/web/middleware"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

func SetupRouter() *gin.Engine {
	r := gin.Default()
	r.Use(middleware.CORS())

	cfg := config.Get()
	secretPath := strings.Trim(cfg.SecretPath, "/")

	var baseGroup *gin.RouterGroup
	if secretPath != "" {
		baseGroup = r.Group("/" + secretPath)
	} else {
		baseGroup = r.Group("/")
	}

	api := baseGroup.Group("/api")
	{
		api.POST("/login", controller.Login)
		api.POST("/logout", controller.Logout)

		authAPI := api.Group("")
		authAPI.Use(middleware.AuthRequired())
		{
			authAPI.PUT("/change-password", controller.ChangePassword)

			dashboard := authAPI.Group("/dashboard")
			{
				dashboard.GET("/stats", controller.GetDashboardStats)
				dashboard.GET("/recent-orders", controller.GetRecentOrders)
			}

			shops := authAPI.Group("/shops")
			{
				shops.GET("", controller.ListShops)
				shops.GET("/all", controller.GetAllShops)
				shops.GET("/template", controller.ShopTemplate)
				shops.GET("/export", controller.ExportShops)
				shops.POST("/import", controller.ImportShops)
				shops.GET("/:id", controller.GetShop)
				shops.POST("", controller.CreateShop)
				shops.PUT("/:id", controller.UpdateShop)
				shops.DELETE("/:id", controller.DeleteShop)
			}

			suppliers := authAPI.Group("/suppliers")
			{
				suppliers.GET("", controller.ListSuppliers)
				suppliers.GET("/all", controller.GetAllSuppliers)
				suppliers.GET("/template", controller.SupplierTemplate)
				suppliers.GET("/export", controller.ExportSuppliers)
				suppliers.POST("/import", controller.ImportSuppliers)
				suppliers.GET("/:id", controller.GetSupplier)
				suppliers.POST("", controller.CreateSupplier)
				suppliers.PUT("/:id", controller.UpdateSupplier)
				suppliers.DELETE("/:id", controller.DeleteSupplier)
			}

			products := authAPI.Group("/products")
			{
				products.GET("", controller.ListProducts)
				products.GET("/template", controller.ProductTemplate)
				products.GET("/export", controller.ExportProducts)
				products.POST("/import", controller.ImportProducts)
				products.GET("/lookup/:sku", controller.GetProductBySKU)
				products.GET("/supplier/:supplier_id", controller.GetProductsBySupplier)
				products.GET("/:id", controller.GetProduct)
				products.POST("", controller.CreateProduct)
				products.PUT("/:id", controller.UpdateProduct)
				products.DELETE("/:id", controller.DeleteProduct)
			}

			orders := authAPI.Group("/orders")
			{
				orders.GET("", controller.ListOrders)
				orders.GET("/template", controller.OrderTemplate)
				orders.GET("/export", controller.ExportOrders)
				orders.POST("/import", controller.ImportOrders)
				orders.POST("/match", controller.ProcessAllOrders)
				orders.GET("/:id", controller.GetOrder)
				orders.POST("", controller.CreateOrder)
				orders.PUT("/:id", controller.UpdateOrder)
				orders.DELETE("/:id", controller.DeleteOrder)
			}

			purchaseOrders := authAPI.Group("/purchase-orders")
			{
				purchaseOrders.GET("", controller.ListPurchaseOrders)
				purchaseOrders.GET("/export", controller.ExportPurchaseOrders)
				purchaseOrders.POST("/generate/:order_id", controller.GeneratePurchaseOrder)
				purchaseOrders.GET("/:id", controller.GetPurchaseOrder)
				purchaseOrders.POST("", controller.CreatePurchaseOrder)
				purchaseOrders.PUT("/:id", controller.UpdatePurchaseOrder)
				purchaseOrders.PUT("/:id/status", controller.UpdatePurchaseOrderStatus)
			}

			tools := authAPI.Group("/tools")
			{
				tools.POST("/process-all", controller.ProcessAllOrdersTool)
				tools.POST("/backup", controller.BackupDatabase)
				tools.POST("/backup/create", controller.BackupDatabase)
				tools.GET("/backups", controller.ListBackups)
				tools.GET("/backup/:filename/download", controller.DownloadBackup)
				tools.DELETE("/backup/:id", controller.DeleteBackup)
			}
		}
	}

	// 静态资源在根级别提供服务（不经过 secret path 保护）
	// 静态资源是 JS/CSS 文件，不含敏感数据
	r.StaticFS("/assets", http.Dir("./static/assets"))

	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path

		if strings.Contains(path, "/api/") {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "API endpoint not found"})
			return
		}

		if strings.Contains(path, "/assets/") {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Asset not found"})
			return
		}

		// 读取 index.html 并注入 secret path，供前端使用
		htmlBytes, err := os.ReadFile("./static/index.html")
		if err != nil {
			c.String(http.StatusInternalServerError, "index.html not found")
			return
		}

		html := string(htmlBytes)
		if secretPath != "" {
			inject := fmt.Sprintf("<script>window.__BASE_PATH__=\"/%s\";</script>", secretPath)
			html = strings.Replace(html, "</head>", inject+"</head>", 1)
		} else {
			html = strings.Replace(html, "</head>", "<script>window.__BASE_PATH__=\"\";</script></head>", 1)
		}

		c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(html))
	})

	return r
}
