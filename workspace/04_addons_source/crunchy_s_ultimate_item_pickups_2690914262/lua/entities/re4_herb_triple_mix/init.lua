AddCSLuaFile( "shared.lua" )
include('shared.lua')

local pickup_sound = Sound("herb_pickup_yellow.wav")

function ENT:Initialize()
	self.Entity:SetModel("models/crunchy/props/re4_props/herb_mix_triple.mdl")
    self.Entity:PhysicsInit(SOLID_VPHYSICS)
    self.Entity:SetMoveType(MOVETYPE_VPHYSICS)
    self.Entity:SetSolid(SOLID_VPHYSICS)
    self.Entity:DrawShadow(true)
    self.Entity:SetCollisionGroup(COLLISION_GROUP_WEAPON)
    self:DropToFloor()
	self:SetModelScale(2.00)
    local phys = self:GetPhysicsObject()
    if CLIENT then
        phys:Wake()
    end
end

function ENT:Use(plyUse)
	if ( plyUse:Health() < plyUse:GetMaxHealth() ) then
	plyUse:SetHealth( math.Clamp( plyUse:Health() + 100, 0, plyUse:GetMaxHealth() ) )
	plyUse:SetArmor( math.Clamp( plyUse:Armor() + 50, 0, plyUse:GetMaxArmor() ) )
	self:EmitSound(pickup_sound)
	self:Remove(true)
	end
end

function ENT:OnRemove()
	self:Remove()
end