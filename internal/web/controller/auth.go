package controller

import (
	"doudian/internal/service"
	"doudian/internal/util"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// LoginRequest 登录请求
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// Login 用户登录
// POST /api/login
func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	user, err := service.Login(req.Username, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	// 生成 JWT token
	token, err := util.GenerateToken(user.ID, user.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "生成 token 失败",
		})
		return
	}

	// 设置 session cookie（简单实现：user_id:username），作为降级方案
	sessionValue := strconv.FormatUint(uint64(user.ID), 10) + ":" + user.Username
	c.SetCookie("doudian_session", sessionValue, 3600*24, "/", "", false, true)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "登录成功",
		"data": gin.H{
			"id":       user.ID,
			"username": user.Username,
			"token":    token,
		},
	})
}

// Logout 用户登出
// POST /api/logout
func Logout(c *gin.Context) {
	// 清除 session cookie
	c.SetCookie("doudian_session", "", -1, "/", "", false, true)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "登出成功",
	})
}

// ChangePasswordRequest 修改密码请求
type ChangePasswordRequest struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6"`
}

// ChangePassword 修改密码
// PUT /api/change-password
func ChangePassword(c *gin.Context) {
	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	uidStr, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "未登录"})
		return
	}
	uid, err := strconv.ParseUint(uidStr.(string), 10, 64)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "用户信息无效"})
		return
	}

	if err := service.ChangePassword(uint(uid), req.OldPassword, req.NewPassword); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "密码修改成功"})
}
