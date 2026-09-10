package service

import (
	"doudian/internal/database"
	"doudian/internal/database/model"
	"errors"

	"golang.org/x/crypto/bcrypt"
)

// Login 用户登录验证
func Login(username, password string) (*model.User, error) {
	var user model.User
	if err := database.DB.Where("username = ?", username).First(&user).Error; err != nil {
		return nil, errors.New("用户名或密码错误")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, errors.New("用户名或密码错误")
	}

	return &user, nil
}

// GetUserByID 根据ID获取用户
func GetUserByID(id uint) (*model.User, error) {
	var user model.User
	err := database.DB.First(&user, id).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// ChangePassword 修改密码：校验原密码 -> bcrypt 重新哈希 -> 更新
func ChangePassword(userID uint, oldPassword, newPassword string) error {
	var user model.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		return errors.New("用户不存在")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(oldPassword)); err != nil {
		return errors.New("原密码错误")
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return errors.New("密码加密失败")
	}

	return database.DB.Model(&user).Update("password_hash", string(hashed)).Error
}
