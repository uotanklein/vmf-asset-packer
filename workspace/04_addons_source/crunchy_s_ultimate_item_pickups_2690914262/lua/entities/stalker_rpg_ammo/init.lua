AddCSLuaFile( "shared.lua" )
include('shared.lua')

-- RE4 ammo pickup sound
local pickup_sound = Sound("ammo_pickup3.wav")

function ENT:Initialize()
    self.Entity:SetModel("models/crunchy/props/stalker_props/ammo_og_7b.mdl")
    self.Entity:PhysicsInit(SOLID_VPHYSICS)
    self.Entity:SetMoveType(MOVETYPE_VPHYSICS)
    self.Entity:SetSolid(SOLID_VPHYSICS)
    self.Entity:DrawShadow(true)
    self.Entity:SetCollisionGroup(COLLISION_GROUP_WEAPON)
    self.Entity:DropToFloor()
    local phys = self:GetPhysicsObject()
    if CLIENT then
        phys:Wake()
    end
end

function ENT:Use( activator, caller )
    self:EmitSound(pickup_sound)
    caller:GiveAmmo(1, "rpg_round", false)
    self:Remove();
end