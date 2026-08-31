ENT.Type = "anim"
ENT.Base = "arc9_eft_26x75_green"
ENT.Spawnable = false
ENT.AdminSpawnable = false

AddCSLuaFile()

ENT.FlareColor = Color(49, 12, 38, 37)

ENT.ArmTime = 0.4

function ENT:Think()
    if CurTime() >= self.at then
        if CLIENT then
            local vPoint = self:GetPos()
            -- local effectdata = EffectData()
            -- effectdata:SetOrigin( vPoint )
            -- effectdata:SetScale(10)
            -- util.Effect( "party_fireworks", effectdata )
    
    
            -- local particl = CreateParticleSystemNoEntity( "party_fireworks", vPoint )

            -- local particl = ParticleEffect( "party_fireworks", vPoint, Angle( 0, 0, 0 ) ) 

            local particl = CreateParticleSystemNoEntity( "party_fireworks", vPoint )
            -- particl:SetControlPoint( 3, Vector(102, 120, 120) )
            -- timer.Simple( 5, function() particl:StopEmission( false, true, false ) end )

            self.at = math.huge
        else
            sound.Play("weapons/darsu_eft/rsp/gren_expl4_far.ogg", self:GetPos(), 160, 100, 1)
            self:Remove()
        end
    end
end