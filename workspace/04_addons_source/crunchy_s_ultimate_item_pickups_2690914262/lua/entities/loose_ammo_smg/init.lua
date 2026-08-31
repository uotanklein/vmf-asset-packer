AddCSLuaFile( "shared.lua" )
include('shared.lua')


local pickup_sound = Sound("contagion_ammo_smg.wav")

function ENT:Initialize()
    self.Entity:SetModel("models/crunchy/props/re2_props/Loose/submachinegun_bullets.mdl")
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
    caller:GiveAmmo(( math.random( 20, 30 ) ), "SMG1", false)
    self:Remove();
end