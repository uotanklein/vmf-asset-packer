AddCSLuaFile( "shared.lua" )
include('shared.lua')

local pickup_sound = Sound("aid_med.wav")

function ENT:Initialize()
	self.Entity:SetModel("models/crunchy/props/re8_props/re8_village_first_aid_med.mdl")
    self.Entity:PhysicsInit(SOLID_VPHYSICS)
    self.Entity:SetMoveType(MOVETYPE_VPHYSICS)
    self.Entity:SetSolid(SOLID_VPHYSICS)
    self.Entity:DrawShadow(true)
    self.Entity:SetCollisionGroup(COLLISION_GROUP_WEAPON)
    self:DropToFloor()
	self:SetModelScale(1.75)
    local phys = self:GetPhysicsObject()
    if CLIENT then
        phys:Wake()
    end
end

function ENT:Use(plyUse)
	if ( plyUse:Health() < plyUse:GetMaxHealth() ) then
	plyUse:SetHealth( math.Clamp( plyUse:Health() + 75, 0, plyUse:GetMaxHealth() ) )
	self:EmitSound(pickup_sound)
	self:Remove()
	end
end

function ENT:OnRemove()
	self:Remove()
end