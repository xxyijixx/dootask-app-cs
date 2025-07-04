package service

import (
	"chatdesk/internal/models"
	"chatdesk/internal/pkg/database"
)

type AgentService struct{}

var Agent = &AgentService{}

func (a *AgentService) Delete(agentID uint) error {
	err := database.GetDB().Delete(&models.Agent{
		ID: agentID,
	}).Error
	return err
}
