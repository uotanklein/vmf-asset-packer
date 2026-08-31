AddCSLuaFile( "shared.lua" )
include('shared.lua')

-- RE4 ammo pickup sound
local pickup_sound = Sound("re2_ammo3.wav")

function ENT:Initialize()
    self.Entity:SetModel("models/crunchy/props/re3_props/re3_remake_shotgun_shells.mdl")
    self.Entity:PhysicsInit(SOLID_VPHYSICS)
    self.Entity:SetMoveType(MOVETYPE_VPHYSICS)
    self.Entity:SetSolid(SOLID_VPHYSICS)
    self.Entity:DrawShadow(true)
    self.Entity:SetCollisionGroup(COLLISION_GROUP_WEAPON)
    self:DropToFloor()
	self:SetModelScale(1.40)
    local phys = self:GetPhysicsObject()
    if CLIENT then
        phys:Wake()
    end
end

function ENT:Use( activator, caller )
    self:EmitSound(pickup_sound)
    caller:GiveAmmo(12, "Buckshot", false)
    self:Remove();
end