AddCSLuaFile()

ENT.Base = "base_entity"
ENT.Type = "anim"
ENT.AutomaticFrameAdvance = true

function ENT:Initialize()
	self:SetSolid(SOLID_OBB)
end

function ENT:Think()
	self:NextThink(CurTime()) --set the next think to run as soon as possible, i.e. the next frame
	return true --true is returned because I used Entity:NextThink to override the next execution time
end

if SERVER then return end

function ENT:Draw(flags)
	self:DrawModel(flags)
end

function ENT:DrawTranslucent(flags)
	self:Draw(flags)
end